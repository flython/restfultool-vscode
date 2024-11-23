package main

import (
	"go-api-demo/echo_server"
	"go-api-demo/gin_server"
	"log"
)

func main() {
	// 启动 Gin 服务器（在 8080 端口）
	ginRouter := gin_server.SetupGinRouter()
	go func() {
		if err := ginRouter.Run(":8080"); err != nil {
			log.Fatal("Failed to start Gin server:", err)
		}
	}()

	// 启动 Echo 服务器（在 8081 端口）
	echoRouter := echo_server.SetupEchoRouter()
	if err := echoRouter.Start(":8081"); err != nil {
		log.Fatal("Failed to start Echo server:", err)
	}
}
