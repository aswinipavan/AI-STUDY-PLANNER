package com.aistudyplanner;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.Properties;

public class CheckDb {
    public static void main(String[] args) {
        String url = System.getenv("SUPABASE_DB_URL");
        Properties props = new Properties();
        props.setProperty("user", System.getenv("SUPABASE_DB_USER"));
        props.setProperty("password", System.getenv("SUPABASE_DB_PASSWORD"));
        try {
            System.out.println("Attempting to connect to database...");
            Connection conn = DriverManager.getConnection(url, props);
            System.out.println("SUCCESS! Connected to the database.");
            conn.close();
        } catch (Exception e) {
            System.out.println("FAILED to connect to the database.");
            e.printStackTrace();
        }
    }
}
