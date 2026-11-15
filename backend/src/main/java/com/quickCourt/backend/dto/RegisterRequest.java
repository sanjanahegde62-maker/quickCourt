package com.quickCourt.backend.dto;

import com.quickCourt.backend.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {

    private String fullName;
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Enter a valid email address")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    private Object role;

    public void setEmail(String email) {
        this.email = email != null ? email.trim() : null;
    }

    public String getNormalizedEmail() {
        return email != null ? email.toLowerCase().trim() : "";
    }

    public String resolveFullName() {
        if (fullName != null && !fullName.isBlank()) {
            return fullName.trim();
        }
        if (name != null && !name.isBlank()) {
            return name.trim();
        }
        return "";
    }

    public Role resolveRole() {
        if (role == null) {
            return Role.USER;
        }
        String roleStr = role.toString().trim().toUpperCase().replace("ROLE_", "");
        if ("ADMIN".equals(roleStr)) {
            throw new IllegalArgumentException("Administrator role cannot be assigned during registration");
        }
        if ("OWNER".equals(roleStr) || "FACILITY_OWNER".equals(roleStr)) {
            return Role.FACILITY_OWNER;
        }
        return Role.USER;
    }
}
