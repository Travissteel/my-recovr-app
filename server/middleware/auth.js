const jwt = require('jsonwebtoken');
const pool = require('../database/connection');
const SecurityAudit = require('../utils/securityAudit');
const JWTSecurity = require('../utils/jwtSecurity');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Use enhanced JWT security for token verification
    const tokenData = await JWTSecurity.verifyAccessToken(token);
    
    // Add token data to request for further use
    req.user = {
      id: tokenData.userId,
      role: tokenData.role
    };
    req.sessionId = tokenData.sessionId;
    req.tokenJti = tokenData.jti;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    // Log suspicious activity for invalid tokens (but not expired ones)
    if (error.name === 'JsonWebTokenError') {
      await SecurityAudit.logSuspiciousActivity(req, 
        `Invalid JWT access token: ${error.message}`, 
        'warning'
      );
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.message === 'User not found or inactive') {
      return res.status(401).json({ 
        error: 'Account is deactivated',
        code: 'ACCOUNT_INACTIVE'
      });
    }
    
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    // Use enhanced JWT security for socket authentication
    const tokenData = await JWTSecurity.verifyAccessToken(token);
    
    socket.userId = tokenData.userId;
    socket.user = {
      id: tokenData.userId,
      role: tokenData.role
    };
    socket.sessionId = tokenData.sessionId;
    socket.tokenJti = tokenData.jti;
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    
    // Log suspicious socket authentication attempts
    if (error.name === 'JsonWebTokenError') {
      await SecurityAudit.logSuspiciousActivity(
        { ip: socket.handshake.address, headers: socket.handshake.headers },
        `Invalid JWT token in socket connection: ${error.message}`,
        'warning'
      );
    }
    
    next(new Error('Authentication error'));
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    // Use enhanced JWT security for optional authentication
    const tokenData = await JWTSecurity.verifyAccessToken(token);
    
    req.user = {
      id: tokenData.userId,
      role: tokenData.role
    };
    req.sessionId = tokenData.sessionId;
    req.tokenJti = tokenData.jti;
  } catch (error) {
    // For optional auth, we don't fail on invalid tokens, just continue without user
    console.error('Optional auth error:', error);
  }
  
  next();
};

const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const roleQuery = 'SELECT role FROM group_memberships WHERE user_id = $1 AND group_id = $2';
      const roleResult = await pool.query(roleQuery, [req.user.id, req.params.groupId]);
      
      if (roleResult.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied - not a group member' });
      }
      
      const userRole = roleResult.rows[0].role;
      
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: 'Access denied - insufficient permissions' });
      }
      
      req.userRole = userRole;
      next();
    } catch (error) {
      console.error('Role verification error:', error);
      res.status(500).json({ error: 'Authorization failed' });
    }
  };
};

module.exports = {
  authenticateToken,
  authenticateSocket,
  optionalAuth,
  requireRole
};