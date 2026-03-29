"""
crypto.py — Utilitários de criptografia Fernet para segredos de instâncias.

A chave Fernet é derivada do SECRET_KEY via SHA-256, garantindo que o mesmo
SECRET_KEY usado para JWT assine também a criptografia de credenciais.

Uso:
    from app.utils.crypto import encrypt_secret, decrypt_secret

    encrypted = encrypt_secret("minha-senha")
    original  = decrypt_secret(encrypted)
"""

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings


def _fernet() -> Fernet:
    """Instancia Fernet derivando a chave de 32 bytes do SECRET_KEY via SHA-256."""
    key_bytes = hashlib.sha256(settings.secret_key.encode("utf-8")).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)


def encrypt_secret(plaintext: str) -> str:
    """
    Criptografa um texto simples com Fernet e retorna string base64 segura para URL.
    Retorna string vazia se plaintext for None ou vazio.
    """
    if not plaintext:
        return ""
    return _fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_secret(ciphertext: str) -> str:
    """
    Decripta um token Fernet e retorna o texto original.
    Retorna string vazia se ciphertext for None, vazio ou inválido.
    Loga aviso em caso de token inválido (não propaga exceção).
    """
    if not ciphertext:
        return ""
    try:
        return _fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except (InvalidToken, Exception):
        import logging
        logging.getLogger(__name__).warning(
            "Falha ao decriptar segredo — token inválido ou SECRET_KEY alterado."
        )
        return ""
