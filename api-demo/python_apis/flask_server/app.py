from flask import Flask, request, jsonify
from flask_restful import Api, Resource

app = Flask(__name__)
api = Api(app)

class HelloWorld(Resource):
    def get(self):
        return {"message": "Hello from Flask!"}

class User(Resource):
    def post(self):
        data = request.get_json()
        return {
            "message": "User created",
            "user": data
        }

class UserDetail(Resource):
    def get(self, user_id):
        return {
            "message": "Get user detail",
            "id": user_id
        }

api.add_resource(HelloWorld, '/flask/hello')
api.add_resource(User, '/flask/user')
api.add_resource(UserDetail, '/flask/user/<string:user_id>')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8083)
