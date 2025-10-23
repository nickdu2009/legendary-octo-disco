package utils

import (
	"errors"
	"time"

	"miniflow/pkg/config"

	"github.com/golang-jwt/jwt/v4"
)

// Claims represents JWT claims
type Claims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// JWTManager manages JWT operations
type JWTManager struct {
	secret     []byte
	expiration time.Duration
}

// NewJWTManager creates a new JWT manager
func NewJWTManager(cfg *config.JWTConfig) *JWTManager {
	return &JWTManager{
		secret:     []byte(cfg.Secret),
		expiration: cfg.GetJWTExpiration(),
	}
}

// GenerateToken generates a JWT token for user
func (j *JWTManager) GenerateToken(userID uint, username string) (string, error) {
	claims := Claims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(j.expiration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "miniflow",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(j.secret)
}

// ParseToken parses and validates a JWT token
func (j *JWTManager) ParseToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return j.secret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		// Check if token is expired
		if claims.ExpiresAt.Before(time.Now()) {
			return nil, errors.New("token已过期")
		}
		return claims, nil
	}

	return nil, errors.New("无效的token")
}

// ValidateToken validates a JWT token and returns user info
func (j *JWTManager) ValidateToken(tokenString string) (uint, string, error) {
	claims, err := j.ParseToken(tokenString)
	if err != nil {
		return 0, "", err
	}

	return claims.UserID, claims.Username, nil
}

// RefreshToken generates a new token for existing valid token
func (j *JWTManager) RefreshToken(tokenString string) (string, error) {
	claims, err := j.ParseToken(tokenString)
	if err != nil {
		return "", err
	}

	// Generate new token with same user info
	return j.GenerateToken(claims.UserID, claims.Username)
}

// Legacy functions for backward compatibility (will be removed when handlers are updated)

var defaultJWTManager *JWTManager

// InitJWT initializes the default JWT manager (deprecated, use dependency injection)
func InitJWT(cfg *config.JWTConfig) {
	defaultJWTManager = NewJWTManager(cfg)
}

// GenerateJWT generates a JWT token using default manager (deprecated)
func GenerateJWT(userID uint, username string) (string, error) {
	if defaultJWTManager == nil {
		return "", errors.New("JWT manager not initialized")
	}
	return defaultJWTManager.GenerateToken(userID, username)
}

// ParseJWT parses JWT token using default manager (deprecated)
func ParseJWT(tokenString string) (*Claims, error) {
	if defaultJWTManager == nil {
		return nil, errors.New("JWT manager not initialized")
	}
	return defaultJWTManager.ParseToken(tokenString)
}
