const role = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'Access denied: No user data available' });
  }

  if (!req.user.role) {
    return res.status(403).json({ message: 'Access denied: User role not specified' });
  }

  if (!roles.includes(req.user.role)) {
    console.log('qwerty :',req.user);
    
    return res.status(403).json({
      message: `Access denied: User role '${req.user.role}' is not one of the allowed roles: ${roles.join(', ')}`,
    });
  }

  next();
};

export default role;