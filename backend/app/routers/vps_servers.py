"""
routers/vps_servers.py — CRUD de servidores VPS + gerenciamento de chaves SSH.

VPS é uma entidade independente que pode hospedar múltiplas instâncias Mautic.
"""

import uuid
from io import StringIO
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.vps_server import VpsServer
from app.routers.auth import get_current_user
from app.models.users import User
from app.utils.crypto import encrypt_secret, decrypt_secret

router = APIRouter(prefix="/vps-servers", tags=["vps-servers"])


# ─── Schemas ────────────────────────────────────────────────────────────────

class VpsServerCreate(BaseModel):
    name: str
    host: str
    ssh_port: int = 22
    ssh_user: str = "root"


class VpsServerOut(BaseModel):
    id: str
    name: str
    host: str
    ssh_port: int
    ssh_user: str
    public_key: Optional[str] = None
    active: bool
    instance_count: int = 0

    model_config = {"from_attributes": True}


class VpsServerUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    ssh_port: Optional[int] = None
    ssh_user: Optional[str] = None
    active: Optional[bool] = None


class SshKeyOut(BaseModel):
    public_key: str


class SshTestResult(BaseModel):
    success: bool
    message: str


# ─── Helpers ────────────────────────────────────────────────────────────────

def _vps_to_out(vps: VpsServer) -> VpsServerOut:
    return VpsServerOut(
        id=str(vps.id),
        name=vps.name,
        host=vps.host,
        ssh_port=vps.ssh_port,
        ssh_user=vps.ssh_user,
        public_key=vps.public_key,
        active=vps.active,
        instance_count=len(vps.instances) if vps.instances else 0,
    )


def _generate_rsa_keypair() -> tuple[str, str]:
    """Gera par de chaves RSA 4096 bits. Retorna (private_pem, public_openssh)."""
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.backends import default_backend

    private_key = rsa.generate_private_key(
        public_exponent=65537, key_size=4096, backend=default_backend(),
    )
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.OpenSSH,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")
    public_openssh = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.OpenSSH,
        format=serialization.PublicFormat.OpenSSH,
    ).decode("utf-8")
    return private_pem, public_openssh


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/", response_model=list[VpsServerOut])
async def list_vps_servers(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(VpsServer).order_by(VpsServer.name))
    return [_vps_to_out(v) for v in result.scalars().unique().all()]


@router.post("/", response_model=VpsServerOut, status_code=status.HTTP_201_CREATED)
async def create_vps_server(
    data: VpsServerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin",):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    vps = VpsServer(
        name=data.name,
        host=data.host,
        ssh_port=data.ssh_port,
        ssh_user=data.ssh_user,
    )
    db.add(vps)
    await db.commit()
    await db.refresh(vps)
    return _vps_to_out(vps)


@router.get("/{vps_id}", response_model=VpsServerOut)
async def get_vps_server(
    vps_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(VpsServer).where(VpsServer.id == vps_id))
    vps = result.scalars().first()
    if not vps:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VPS não encontrada")
    return _vps_to_out(vps)


@router.patch("/{vps_id}", response_model=VpsServerOut)
async def update_vps_server(
    vps_id: uuid.UUID,
    data: VpsServerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin",):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    result = await db.execute(select(VpsServer).where(VpsServer.id == vps_id))
    vps = result.scalars().first()
    if not vps:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VPS não encontrada")

    updates = data.model_dump(exclude_none=True)
    for field, value in updates.items():
        setattr(vps, field, value)

    await db.commit()
    await db.refresh(vps)
    return _vps_to_out(vps)


@router.delete("/{vps_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vps_server(
    vps_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin",):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    result = await db.execute(select(VpsServer).where(VpsServer.id == vps_id))
    vps = result.scalars().first()
    if not vps:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VPS não encontrada")

    await db.delete(vps)
    await db.commit()


@router.post("/{vps_id}/generate-ssh-key", response_model=SshKeyOut)
async def generate_ssh_key(
    vps_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gera novo par RSA 4096. Privada armazenada Fernet. Pública retornada."""
    if current_user.role not in ("admin",):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    result = await db.execute(select(VpsServer).where(VpsServer.id == vps_id))
    vps = result.scalars().first()
    if not vps:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VPS não encontrada")

    private_pem, public_openssh = _generate_rsa_keypair()
    vps.private_key_enc = encrypt_secret(private_pem)
    vps.public_key = public_openssh

    await db.commit()
    return SshKeyOut(public_key=public_openssh)


@router.post("/{vps_id}/test-ssh", response_model=SshTestResult)
async def test_ssh_connection(
    vps_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Testa conexão SSH com a VPS usando a chave privada armazenada."""
    import asyncio
    import paramiko

    result = await db.execute(select(VpsServer).where(VpsServer.id == vps_id))
    vps = result.scalars().first()
    if not vps:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VPS não encontrada")

    if not vps.host:
        return SshTestResult(success=False, message="Host SSH não configurado.")

    if not vps.private_key_enc:
        return SshTestResult(success=False, message="Chave SSH não gerada. Clique em 'Gerar Chave' primeiro.")

    private_pem = decrypt_secret(vps.private_key_enc)
    if not private_pem:
        return SshTestResult(success=False, message="Falha ao decriptar chave privada.")

    def _do_test() -> SshTestResult:
        try:
            key = paramiko.RSAKey.from_private_key(StringIO(private_pem))
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            client.connect(
                hostname=vps.host,
                port=vps.ssh_port or 22,
                username=vps.ssh_user or "root",
                pkey=key, timeout=10,
                look_for_keys=False, allow_agent=False,
            )
            _, stdout, _ = client.exec_command("echo ok", timeout=5)
            output = stdout.read().decode().strip()
            client.close()
            if output == "ok":
                return SshTestResult(success=True, message="Conexão SSH estabelecida com sucesso.")
            return SshTestResult(success=False, message=f"Resposta inesperada: {output}")
        except paramiko.AuthenticationException:
            return SshTestResult(
                success=False,
                message="Autenticação negada. Verifique se a chave pública foi adicionada em ~/.ssh/authorized_keys na VPS.",
            )
        except Exception as e:
            return SshTestResult(success=False, message=f"Erro de conexão: {e}")

    return await asyncio.get_event_loop().run_in_executor(None, _do_test)
