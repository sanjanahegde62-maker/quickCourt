package com.quickCourt.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.File;

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
