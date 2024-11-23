package gin_server

import (
	"github.com/gin-gonic/gin"
	"net/http"
)

func SetupGinRouter() *gin.Engine {
	router := gin.Default()

	// GET 请求示例
	router.GET("/gin/hello", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Hello from Gin!",
		})
	})

	// POST 请求示例
	router.POST("/gin/user", func(c *gin.Context) {
		var user struct {
			Name  string `json:"name"`
			Email string `json:"email"`
		}
		if err := c.ShouldBindJSON(&user); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"message": "User created",
			"user":    user,
		})
	})

	// 带参数的 GET 请求示例
	router.GET("/gin/user/:id", func(c *gin.Context) {
		id := c.Param("id")
		c.JSON(http.StatusOK, gin.H{
			"message": "Get user detail",
			"id":      id,
		})
	})

	return router
}
