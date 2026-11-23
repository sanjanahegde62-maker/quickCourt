package com.quickCourt.backend;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.File;
import java.util.TimeZone;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		File dbDir = new File(System.getProperty("user.home"), ".quickcourt");
		if (!dbDir.exists()) {
			dbDir.mkdirs();
		}
		SpringApplication.run(BackendApplication.class, args);
	}

}
