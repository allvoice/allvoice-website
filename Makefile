VERSION=v0.1.0

push: build
	docker push us-west1-docker.pkg.dev/allvoice/allvoice-docker/allvoice-website:latest
	docker push us-west1-docker.pkg.dev/allvoice/allvoice-docker/allvoice-website:$(VERSION)

# --no-cache is needed bc prisma is a part of deps container build
build:
	docker build --no-cache \
	-t us-west1-docker.pkg.dev/allvoice/allvoice-docker/allvoice-website:latest \
	-t us-west1-docker.pkg.dev/allvoice/allvoice-docker/allvoice-website:$(VERSION) \
	--build-arg "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y3JlYXRpdmUtc2VhbC0zNy5jbGVyay5hY2NvdW50cy5kZXYk" \
	--build-arg "NEXT_PUBLIC_ELEVENLABS_MAX_ACTIVE_SAMPLES=25" \
	--build-arg "NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in" \
	--build-arg "NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up" \
	--build-arg "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/" \
	--build-arg "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/" \
	.


seal_dev_env:
	kubectl -n allvoice create secret generic dev-env --from-env-file=.env --dry-run=client -o yaml \
	| kubeseal --controller-name sealed-secrets --controller-namespace sealed-secrets -o yaml \
	> ./kubernetes/sealed-dev-env.yaml