"""
routers/instances.py — CRUD de instâncias Mautic + gerenciamento de serviços.

A API mantém formato flat (campos de credencial no mesmo nível) para
compatibilidade com o frontend. Internamente, credenciais vivem em
tabelas separadas (1:1 com Instance).

SSH pertence à VPS (vps_servers), não à instância.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.instance import Instance, InstanceApiCredential, InstanceDbCredential
from app.models.instance_service import InstanceService, ServiceType
from app.routers.auth import get_current_user
from app.models.users import User
from app.utils.crypto import encrypt_secret

router = APIRouter(prefix="/instances", tags=["instances"])


# ─── Schemas ────────────────────────────────────────────────────────────────

class InstanceCreate(BaseModel):
    name: str
    url: str
    api_user: str
    api_password: str
    vps_id: Optional[str] = None
    db_host: Optional[str] = None
    db_port: int = 3306
    db_name: Optional[str] = None
    db_user: Optional[str] = None
    db_password: Optional[str] = None


class ServiceOut(BaseModel):
    id: str
    service_type: str
    container_name: str
    active: bool

    model_config = {"from_attributes": True}


class InstanceOut(BaseModel):
    id: str
    name: str
    url: str
    api_user: Optional[str] = None
    vps_id: Optional[str] = None
    vps_name: Optional[str] = None
    db_host: Optional[str] = None
    active: bool
    services: list[ServiceOut] = []


class InstanceUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    api_user: Optional[str] = None
    api_password: Optional[str] = None
    active: Optional[bool] = None
    vps_id: Optional[str] = None
    db_host: Optional[str] = None
    db_port: Optional[int] = None
    db_name: Optional[str] = None
    db_user: Optional[str] = None
    db_password: Optional[str] = None


class ServiceCreate(BaseModel):
    service_type: str  # database | crons | web
    container_name: str


class ServiceUpdate(BaseModel):
    container_name: Optional[str] = None
    active: Optional[bool] = None


# ─── Helpers ────────────────────────────────────────────────────────────────

def _instance_to_out(inst: Instance) -> InstanceOut:
    """Converte Instance (com relationships) para resposta flat."""
    services = [
        ServiceOut(
            id=str(s.id),
            service_type=s.service_type if isinstance(s.service_type, str) else s.service_type.value,
            container_name=s.container_name,
            active=s.active,
        )
        for s in (inst.services or [])
    ]
    return InstanceOut(
        id=str(inst.id),
        name=inst.name,
        url=inst.url,
        api_user=inst.api_user,
        vps_id=str(inst.vps_id) if inst.vps_id else None,
        vps_name=inst.vps.name if inst.vps else None,
        db_host=inst.db_host,
        active=inst.active,
        services=services,
    )


def _get_instance_or_404(instance, instance_id: uuid.UUID) -> Instance:
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Instância não encontrada",
        )
    return instance


# ─── Endpoints — Instâncias ─────────────────────────────────────────────────

@router.get("/", response_model=list[InstanceOut])
async def list_instances(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Instance).order_by(Instance.name))
    return [_instance_to_out(i) for i in result.scalars().unique().all()]


@router.post("/", response_model=InstanceOut, status_code=status.HTTP_201_CREATED)
async def create_instance(
    data: InstanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin",):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    instance = Instance(
        name=data.name,
        url=data.url,
        vps_id=uuid.UUID(data.vps_id) if data.vps_id else None,
    )

    # API credentials (obrigatório)
    instance.api_creds = InstanceApiCredential(
        username=data.api_user,
        password_enc=encrypt_secret(data.api_password),
    )

    # DB credentials (opcional)
    if data.db_host and data.db_name and data.db_user:
        instance.db_creds = InstanceDbCredential(
            host=data.db_host,
            port=data.db_port,
            dbname=data.db_name,
            username=data.db_user,
            password_enc=encrypt_secret(data.db_password) if data.db_password else "",
        )

    db.add(instance)
    await db.commit()
    await db.refresh(instance)
    return _instance_to_out(instance)


@router.get("/{instance_id}", response_model=InstanceOut)
async def get_instance(
    instance_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Instance).where(Instance.id == instance_id))
    instance = _get_instance_or_404(result.scalars().first(), instance_id)
    return _instance_to_out(instance)


@router.patch("/{instance_id}", response_model=InstanceOut)
async def update_instance(
    instance_id: uuid.UUID,
    data: InstanceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin",):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    result = await db.execute(select(Instance).where(Instance.id == instance_id))
    instance = _get_instance_or_404(result.scalars().first(), instance_id)

    updates = data.model_dump(exclude_none=True)

    # Instance fields
    for field in ("name", "url", "active"):
        if field in updates:
            setattr(instance, field, updates[field])

    # VPS association
    if "vps_id" in updates:
        instance.vps_id = uuid.UUID(updates["vps_id"]) if updates["vps_id"] else None

    # API credentials
    api_fields = {k: updates[k] for k in ("api_user", "api_password") if k in updates}
    if api_fields:
        if not instance.api_creds:
            instance.api_creds = InstanceApiCredential(
                instance_id=instance.id,
                username=api_fields.get("api_user", ""),
                password_enc="",
            )
        if "api_user" in api_fields:
            instance.api_creds.username = api_fields["api_user"]
        if "api_password" in api_fields:
            instance.api_creds.password_enc = encrypt_secret(api_fields["api_password"])

    # DB credentials
    db_fields = {k: updates[k] for k in ("db_host", "db_port", "db_name", "db_user", "db_password") if k in updates}
    if db_fields:
        if not instance.db_creds:
            instance.db_creds = InstanceDbCredential(
                instance_id=instance.id,
                host=db_fields.get("db_host", ""),
                port=db_fields.get("db_port", 3306),
                dbname=db_fields.get("db_name", ""),
                username=db_fields.get("db_user", ""),
                password_enc="",
            )
        if "db_host" in db_fields:
            instance.db_creds.host = db_fields["db_host"]
        if "db_port" in db_fields:
            instance.db_creds.port = db_fields["db_port"]
        if "db_name" in db_fields:
            instance.db_creds.dbname = db_fields["db_name"]
        if "db_user" in db_fields:
            instance.db_creds.username = db_fields["db_user"]
        if "db_password" in db_fields:
            instance.db_creds.password_enc = encrypt_secret(db_fields["db_password"])

    await db.commit()
    await db.refresh(instance)
    return _instance_to_out(instance)


@router.delete("/{instance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_instance(
    instance_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin",):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    result = await db.execute(select(Instance).where(Instance.id == instance_id))
    instance = _get_instance_or_404(result.scalars().first(), instance_id)
    await db.delete(instance)
    await db.commit()


# ─── Endpoints — Serviços (containers monitorados) ─────────────────────────

@router.get("/{instance_id}/services", response_model=list[ServiceOut])
async def list_services(
    instance_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(InstanceService)
        .where(InstanceService.instance_id == instance_id)
        .order_by(InstanceService.service_type)
    )
    return [
        ServiceOut(
            id=str(s.id),
            service_type=s.service_type if isinstance(s.service_type, str) else s.service_type.value,
            container_name=s.container_name,
            active=s.active,
        )
        for s in result.scalars().all()
    ]


@router.post("/{instance_id}/services", response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
async def create_service(
    instance_id: uuid.UUID,
    data: ServiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin",):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    # Valida que a instância existe
    result = await db.execute(select(Instance).where(Instance.id == instance_id))
    if not result.scalars().first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instância não encontrada")

    # Valida service_type
    if data.service_type not in [st.value for st in ServiceType]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Tipo inválido. Valores aceitos: {[st.value for st in ServiceType]}",
        )

    service = InstanceService(
        instance_id=instance_id,
        service_type=data.service_type,
        container_name=data.container_name,
    )
    db.add(service)
    await db.commit()
    await db.refresh(service)
    return ServiceOut(
        id=str(service.id),
        service_type=service.service_type if isinstance(service.service_type, str) else service.service_type.value,
        container_name=service.container_name,
        active=service.active,
    )


@router.patch("/{instance_id}/services/{service_id}", response_model=ServiceOut)
async def update_service(
    instance_id: uuid.UUID,
    service_id: uuid.UUID,
    data: ServiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin",):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    result = await db.execute(
        select(InstanceService).where(
            InstanceService.id == service_id,
            InstanceService.instance_id == instance_id,
        )
    )
    service = result.scalars().first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Serviço não encontrado")

    updates = data.model_dump(exclude_none=True)
    for field, value in updates.items():
        setattr(service, field, value)

    await db.commit()
    await db.refresh(service)
    return ServiceOut(
        id=str(service.id),
        service_type=service.service_type if isinstance(service.service_type, str) else service.service_type.value,
        container_name=service.container_name,
        active=service.active,
    )


@router.delete("/{instance_id}/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    instance_id: uuid.UUID,
    service_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin",):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    result = await db.execute(
        select(InstanceService).where(
            InstanceService.id == service_id,
            InstanceService.instance_id == instance_id,
        )
    )
    service = result.scalars().first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Serviço não encontrado")

    await db.delete(service)
    await db.commit()
