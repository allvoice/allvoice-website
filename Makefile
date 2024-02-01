VERSION=v0.4.4

push: build
	docker push us-west1-docker.pkg.dev/allvoice/allvoice-docker/allvoice-website:latest
	docker push us-west1-docker.pkg.dev/allvoice/allvoice-docker/allvoice-website:$(VERSION)

build:
	docker build --platform linux/amd64 \
	-t us-west1-docker.pkg.dev/allvoice/allvoice-docker/allvoice-website:latest \
	-t us-west1-docker.pkg.dev/allvoice/allvoice-docker/allvoice-website:$(VERSION) \
	--build-arg "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuYWxsdm9pY2UuYWkk" \
	--build-arg "NEXT_PUBLIC_ELEVENLABS_MAX_ACTIVE_SAMPLES=25" \
	--build-arg "NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in" \
	--build-arg "NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up" \
	--build-arg "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/" \
	--build-arg "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/" \
	.


seal_prod_env:
	kubectl -n allvoice create secret generic prod-env --from-env-file=.env.prod --dry-run=client -o yaml \
	| kubeseal --controller-name sealed-secrets --controller-namespace sealed-secrets -o yaml \
	> ./kubernetes/sealed-prod-env.yaml