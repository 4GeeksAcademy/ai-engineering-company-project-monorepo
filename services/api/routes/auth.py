from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import timedelta
from tinydb import Query
from services.api.models import Token, UserResponse, ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest
from services.api.database import get_user_by_email, get_user_by_id, get_db, save_reset_token, get_reset_token, mark_token_used
from services.api.security import verify_password, create_access_token, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, get_password_hash
from services.api.email_utils import send_reset_email
import secrets
import time

router = APIRouter(prefix="/auth", tags=["Auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.post("/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    # 1. Buscamos el email (OAuth2 siempre llama 'username' al campo de texto del usuario)
    user = get_user_by_email(form_data.username)
    
    if not user:
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    
    # 2. Verificamos que la contraseña plana coincida con el hash
    is_valid = verify_password(form_data.password, user['hashed_password'])
    
    if not is_valid:
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    
    # 3. ¡Son correctos! Creamos el JWT (Token)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user['id']}, expires_delta=access_token_expires
    )
    
    # Se lo devolvemos al frontend
    return {"access_token": access_token, "token_type": "bearer"}


def get_current_user(token: str = Depends(oauth2_scheme)):
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Intentamos decodificar el token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # Verificamos que el usuario aún exista en nuestra DB
    user = get_user_by_id(user_id)
    if user is None:
        raise credentials_exception
    return user


@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: dict = Depends(get_current_user)):
    
    db = get_db()
    ProfileQuery = Query()
    prof = db.table('profiles').search(ProfileQuery.user_id == current_user['id'])
    
    # Hacemos una copia para no alterar el original y le pegamos el perfil
    response_user = current_user.copy()
    response_user['profile'] = prof[0] if prof else None
    
    return response_user

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest):
    # Verificamos silenciosamente
    user = get_user_by_email(request.email)
    if user:
        # Generar token aleatorio seguro
        raw_token = secrets.token_urlsafe(32)
        # Expiración: 30 minutos (1800 segundos)
        expires_at = time.time() + 1800
        
        # Guardar en DB
        save_reset_token(user['email'], raw_token, expires_at)
        
        # Enviar email
        send_reset_email(user['email'], raw_token)
    
    # SIEMPRE devuelve 200, independientemente de si el usuario existe o no
    return {"message": "Si la dirección de correo está en nuestro sistema, recibirás un enlace de restablecimiento en breve."}

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest):
    token_record = get_reset_token(request.token)
    
    if not token_record:
        raise HTTPException(status_code=400, detail="Token inválido o expirado.")
        
    if token_record['used']:
        raise HTTPException(status_code=400, detail="Este token ya ha sido utilizado.")
        
    if time.time() > token_record['expires_at']:
        raise HTTPException(status_code=400, detail="El token ha expirado.")
        
    # El token es válido
    user = get_user_by_email(token_record['email'])
    if not user:
        raise HTTPException(status_code=400, detail="Usuario no encontrado.")
        
    # Actualizar la contraseña
    db = get_db()
    users_table = db.table('users')
    UserQuery = Query()
    new_hashed_password = get_password_hash(request.new_password)
    users_table.update({'hashed_password': new_hashed_password}, UserQuery.email == user['email'])
    
    # Invalidar el token
    mark_token_used(request.token)
    
    return {"message": "Contraseña actualizada exitosamente."}

@router.post("/change-password")
def change_password(request: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    # Verificar la contraseña actual
    is_valid = verify_password(request.current_password, current_user['hashed_password'])
    if not is_valid:
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta.")
        
    # Actualizar la contraseña
    db = get_db()
    users_table = db.table('users')
    UserQuery = Query()
    new_hashed_password = get_password_hash(request.new_password)
    users_table.update({'hashed_password': new_hashed_password}, UserQuery.id == current_user['id'])
    
    return {"message": "Contraseña cambiada exitosamente."}
