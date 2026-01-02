
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../../shared/supabase';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['user-id'] as string;

  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, is_admin')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "Invalid user session" });
    }

    // Attach user to request object
    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['user-id'] as string;

  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, is_admin')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "Invalid user session" });
    }

    if (!user.is_admin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Attach user to request object
    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
}
