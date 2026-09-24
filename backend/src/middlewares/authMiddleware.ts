import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'dog_house_secret_key_palhoca_2026';

export interface UserPayload {
  id: string;
  nome: string;
  email: string;
  cargo: 'ADMIN' | 'PADRAO';
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Token de autenticação não fornecido.',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Formato de token inválido. Esperado: Bearer <token>',
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Token expirado ou inválido.',
    });
  }
}

export function requireRole(allowedRoles: ('ADMIN' | 'PADRAO')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ sucesso: false, mensagem: 'Não autenticado.' });
    }

    if (!allowedRoles.includes(req.user.cargo)) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Acesso negado: seu cargo não possui permissão para esta operação.',
      });
    }

    return next();
  };
}