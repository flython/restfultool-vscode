package com.example.resource;

import com.example.model.User;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.HashMap;
import java.util.Map;

@Path("/jaxrs")
public class DemoResource {

    @GET
    @Path("/hello")
    @Produces(MediaType.APPLICATION_JSON)
    public Response hello() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Hello from JAX-RS!");
        return Response.ok(response).build();
    }

    @POST
    @Path("/user")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response createUser(User user) {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "User created");
        response.put("user", user);
        return Response.ok(response).build();
    }

    @GET
    @Path("/user/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getUser(@PathParam("id") String id) {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Get user detail");
        response.put("id", id);
        return Response.ok(response).build();
    }
}
