from app import create_app

app = create_app()


if __name__ == "__main__":
    app.run(
        host=app.config["BACKEND_HOST"],
        port=app.config["BACKEND_PORT"],
        debug=app.config["DEBUG"],
    )
