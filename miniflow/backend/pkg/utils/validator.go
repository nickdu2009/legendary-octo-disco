package utils

import (
	"regexp"
	"unicode"

	"github.com/go-playground/validator/v10"
)

// CustomValidator wraps the validator with custom validation rules
type CustomValidator struct {
	validator *validator.Validate
}

// NewCustomValidator creates a new custom validator
func NewCustomValidator() *CustomValidator {
	validate := validator.New()
	
	// Register custom validation functions
	validate.RegisterValidation("alphanum_underscore", validateAlphanumUnderscore)
	validate.RegisterValidation("phone_china", validateChinaPhone)
	
	return &CustomValidator{validator: validate}
}

// Validate validates a struct
func (cv *CustomValidator) Validate(i interface{}) error {
	return cv.validator.Struct(i)
}

// validateAlphanumUnderscore validates that the field contains only alphanumeric characters and underscores
func validateAlphanumUnderscore(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	if value == "" {
		return true // Let required validation handle empty values
	}
	
	for _, char := range value {
		if !unicode.IsLetter(char) && !unicode.IsDigit(char) && char != '_' {
			return false
		}
	}
	return true
}

// validateChinaPhone validates Chinese phone number format
func validateChinaPhone(fl validator.FieldLevel) bool {
	phone := fl.Field().String()
	if phone == "" {
		return true // Empty is allowed for optional fields
	}
	
	// Chinese phone number pattern: 1[3-9]xxxxxxxxx (11 digits)
	phoneRegex := regexp.MustCompile(`^1[3-9]\d{9}$`)
	return phoneRegex.MatchString(phone)
}
