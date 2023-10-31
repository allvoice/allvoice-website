push: build
	docker push us-west1-docker.pkg.dev/allvoice/allvoice-docker/allvoice-website

build:
	docker build --no-cache \
	-t us-west1-docker.pkg.dev/allvoice/allvoice-docker/allvoice-website \
	--build-arg "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y3JlYXRpdmUtc2VhbC0zNy5jbGVyay5hY2NvdW50cy5kZXYk" \
	.
