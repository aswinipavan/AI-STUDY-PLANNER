package com.aistudyplanner;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.Properties;

public class CheckDb {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require";
        Properties props = new Properties();
        props.setProperty("user", "postgres.oxxqyisvczzklaxncgix");
        props.setProperty("password", "aswinipavan.@database");
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
