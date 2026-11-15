package com.quickCourt.backend.dto;

import com.quickCourt.backend.entity.Role;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserResponse {
    private Long id;
    private String fullName;
    private String name;
    private String email;
    private Role role;
    private boolean verified;
    private String phone;
    private String status;
}
