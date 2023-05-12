push:
	docker build -t us-west1-docker.pkg.dev/allvoice/allvoice-docker/allvoice-website .
	docker push us-west1-docker.pkg.dev/allvoice/allvoice-docker/allvoice-website