package com.aistudyplanner.model;

/**
 * Enum for chat message roles
 */
public enum ChatRole {
    USER("user"),
    ASSISTANT("assistant");

    private final String value;

    ChatRole(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static ChatRole fromValue(String value) {
        for (ChatRole role : ChatRole.values()) {
            if (role.value.equalsIgnoreCase(value)) {
                return role;
            }
        }
        throw new IllegalArgumentException("Invalid chat role: " + value);
    }
}
