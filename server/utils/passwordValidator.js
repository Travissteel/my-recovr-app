// Password validation utility with strong security requirements
class PasswordValidator {
  static validate(password) {
    const errors = [];
    
    // Minimum length
    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    }
    
    // Maximum length (prevent DoS)
    if (password.length > 128) {
      errors.push('Password must be no more than 128 characters long');
    }
    
    // Uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    // Lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    // Number
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    // Special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    // No common patterns
    if (this.hasCommonPatterns(password)) {
      errors.push('Password contains common patterns and is not secure');
    }
    
    // No personal information (basic check)
    if (this.hasSequentialChars(password)) {
      errors.push('Password cannot contain sequential characters (e.g., 123, abc)');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  static hasCommonPatterns(password) {
    const commonPatterns = [
      /password/i,
      /123456/,
      /qwerty/i,
      /admin/i,
      /letmein/i,
      /welcome/i,
      /monkey/i,
      /dragon/i,
      /master/i,
      /sunshine/i
    ];
    
    return commonPatterns.some(pattern => pattern.test(password));
  }
  
  static hasSequentialChars(password) {
    const sequential = [
      '123456789',
      '987654321',
      'abcdefghijklmnopqrstuvwxyz',
      'zyxwvutsrqponmlkjihgfedcba',
      'qwertyuiop',
      'asdfghjkl',
      'zxcvbnm'
    ];
    
    const lowerPassword = password.toLowerCase();
    
    for (const seq of sequential) {
      for (let i = 0; i <= seq.length - 4; i++) {
        if (lowerPassword.includes(seq.substring(i, i + 4))) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  static getStrengthScore(password) {
    let score = 0;
    
    // Length bonus
    score += Math.min(password.length * 2, 20);
    
    // Character variety
    if (/[a-z]/.test(password)) score += 5;
    if (/[A-Z]/.test(password)) score += 5;
    if (/\d/.test(password)) score += 5;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 10;
    
    // Complexity bonus
    const uniqueChars = new Set(password).size;
    score += uniqueChars * 2;
    
    // Penalty for common patterns
    if (this.hasCommonPatterns(password)) score -= 20;
    if (this.hasSequentialChars(password)) score -= 15;
    
    return Math.max(0, Math.min(100, score));
  }
  
  static getStrengthLevel(password) {
    const score = this.getStrengthScore(password);
    
    if (score < 30) return 'Very Weak';
    if (score < 50) return 'Weak';
    if (score < 70) return 'Fair';
    if (score < 85) return 'Good';
    return 'Strong';
  }
}

module.exports = PasswordValidator;