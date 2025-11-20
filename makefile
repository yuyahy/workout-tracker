run-dev-app:
	cd workout-app && npm run dev
run-prisma-db-studio:
	cd workout-app && npx prisma studio
clean-postgres-data:
	docker exec -it workout-postgres psql -U workout -d workout_db -c 'DELETE FROM "Workout";'
clean-dynamodb-data:
	aws dynamodb scan --table-name WorkoutStats --endpoint-url http://localhost:8000 --output json | \
	jq -r '.Items[] | "aws dynamodb delete-item --table-name WorkoutStats --key '"'"'{\"userId\":{\"S\":\"" + .userId.S + "\"},\"exerciseName\":{\"S\":\"" + .exerciseName.S + "\"}}'"'"' --endpoint-url http://localhost:8000"' | \
	bash
clean-all:
	make clean-postgres-data
	make clean-dynamodb-data
check-dynamodb-items:
	aws dynamodb scan \
		--table-name WorkoutStats \
		--endpoint-url http://localhost:8000 \
		--region us-east-1 \
		--output json | jq . > dynamodb-scan-result.json