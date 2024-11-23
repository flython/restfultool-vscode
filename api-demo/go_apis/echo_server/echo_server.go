package echo_server

import (
	"github.com/labstack/echo/v4"
	"net/http"
)

func SetupEchoRouter() *echo.Echo {
	e := echo.New()

	// GET 请求示例
	e.GET("/echo/hello", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"message": "Hello from Echo!",
		})
	})

	// POST 请求示例
	e.POST("/echo/user", func(c echo.Context) error {
		type User struct {
			Name  string `json:"name"`
			Email string `json:"email"`
		}
		user := new(User)
		if err := c.Bind(user); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": err.Error(),
			})
		}
		return c.JSON(http.StatusOK, map[string]interface{}{
			"message": "User created",
			"user":    user,
		})
	})

	// 带参数的 GET 请求示例
	e.GET("/echo/user/:id", func(c echo.Context) error {
		id := c.Param("id")
		return c.JSON(http.StatusOK, map[string]string{
			"message": "Get user detail",
			"id":      id,
		})
	})

	return e
}
