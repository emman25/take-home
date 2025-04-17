# Real-Time Regex Validator - Titans Take-Home Assessment

## Objective

This project implements a real-time web application where users submit text strings that are validated against a configurable regular expression on the backend. Each submission is processed asynchronously, and users see live status updates ("Validating", "Valid", or "Invalid") via WebSockets.

## Architecture Overview

The system is designed as a distributed application orchestrated using Docker Compose. It consists of the following components:

1.  **Frontend (React/Vite):**
    *   Provides the user interface for submitting strings and viewing the job history.
    *   Built with React (using TypeScript and Vite).
    *   Communicates with the backend via HTTP REST API for submitting jobs and fetching initial history.
    *   Establishes a WebSocket connection to receive real-time status updates for jobs.
    *   Served by an Nginx container, which also acts as a reverse proxy for the backend API and WebSocket connections.

2.  **Backend (NestJS):**
    *   Exposes a REST API (`/jobs`) for creating new validation jobs and retrieving job history.
    *   Handles incoming job requests, saves initial job data to MongoDB with "Validating" status.
    *   Publishes the job details to a Kafka topic (`job.submitted`) for asynchronous processing.
    *   Listens to another Kafka topic (`job.updated`) for results from the validation process.
    *   Includes a WebSocket Gateway (`EventsGateway`) to manage client connections.
    *   When a `job.updated` message is received from Kafka, the gateway broadcasts the updated job status to all connected frontend clients.

3.  **Kafka (Confluent Platform):**
    *   Acts as a message broker for decoupling the initial job submission from the asynchronous validation process.
    *   Uses two topics:
        *   `job.submitted`: Backend API publishes new jobs here. The Kafka Consumer service listens to this.
        *   `job.updated`: The Kafka Consumer service publishes validation results here. The Backend's Kafka Controller listens to this to trigger WebSocket broadcasts.

4.  **Kafka Consumer (Integrated within Backend):**
    *   A NestJS microservice listener running within the main backend application process.
    *   Consumes messages from the `job.submitted` topic.
    *   Simulates a processing delay (configurable via `VALIDATION_DELAY_MS`).
    *   Performs the regex validation against the configured pattern (`REGEX_PATTERN`).
    *   Updates the job status in MongoDB.
    *   Publishes the final job result (including status) to the `job.updated` topic.

5.  **MongoDB:**
    *   The primary database for persisting job information (ID, input string, regex pattern, status, timestamps).

6.  **Redis:**
    *   Included in the stack as per requirements. While not strictly necessary for broadcasting in this single-instance backend setup (NestJS WebSocket gateway handles broadcasting), it's configured and available. For scaling the backend service to multiple instances, the `socket.io-redis` adapter would be configured in `EventsGateway` to enable broadcasting across all instances via Redis Pub/Sub.

7.  **Docker Compose:**
    *   Orchestrates all the services (frontend, backend, kafka, zookeeper, mongodb, redis).
    *   Defines the network (`app-network`) for inter-service communication.
    *   Manages environment variables for configuration (`REGEX_PATTERN`, `VALIDATION_DELAY_MS`, connection URIs).

## Real-Time Update Mechanism

1.  **Submission:** User submits a string via the React frontend.
2.  **API Request:** Frontend sends a POST request to `/api/jobs`.
3.  **Backend API:**
    *   Receives the request.
    *   Creates a job record in MongoDB with status "Validating".
    *   Sends the job details (ID, input, pattern, delay) to the `job.submitted` Kafka topic.
    *   Returns the initial job data (with "Validating" status) to the frontend.
4.  **Kafka Consumer:**
    *   Picks up the message from `job.submitted`.
    *   Waits for the configured delay.
    *   Validates the string against the regex.
    *   Updates the job status in MongoDB (to "Valid" or "Invalid").
    *   Sends the complete, updated job data to the `job.updated` Kafka topic.
5.  **Backend Kafka Listener:**
    *   The `@EventPattern('job.updated')` in `KafkaController` receives the message.
    *   It calls the `EventsGateway`.
6.  **WebSocket Broadcast:**
    *   `EventsGateway` uses `server.emit('jobUpdate', updatedJob)` to broadcast the updated job data to all connected frontend clients.
7.  **Frontend Update:**
    *   The React app's WebSocket listener (`socket.on('jobUpdate', ...)`) receives the data.
    *   The component updates its state, causing the UI (specifically the job list) to re-render with the new status.

## System Reliability & Fault Tolerance

*   **Decoupling:** Kafka decouples the API from the validation logic. If the validation process fails temporarily, jobs remain queued in Kafka for later processing (depending on Kafka configuration).
*   **Persistence:** MongoDB ensures job data is persisted even if services restart.
*   **Asynchronicity:** The system handles validation asynchronously, preventing the API from being blocked by long validation times.
*   **Containerization:** Docker ensures consistent environments and simplifies deployment. Docker Compose health checks could be added for more robust startup sequences.
*   **Error Handling:** Basic error handling and logging are implemented in the backend services. More sophisticated strategies (dead-letter queues in Kafka, retry mechanisms) could be added for production.
*   **Scalability:**
    *   The backend service can be scaled horizontally. Using the `socket.io-redis` adapter is crucial for WebSocket state synchronization across multiple backend instances.
    *   Kafka can be scaled by adding more brokers and partitions.
    *   MongoDB and Redis can be configured as clusters for high availability and scalability.

## Cloud Deployment & Scaling (AWS)

*   **Container Orchestration:** AWS EKS (Elastic Kubernetes Service) or ECS (Elastic Container Service) would be ideal for managing the Docker containers.
    *   We would define Kubernetes Deployments/ReplicaSets or ECS Services for `frontend`, `backend`.
    *   Use StatefulSets (Kubernetes) or manage separately for Kafka/Zookeeper, MongoDB, Redis if not using managed services.
*   **Managed Services:** Leverage AWS managed services for better scalability, reliability, and maintainability:
    *   **Kafka:** Amazon MSK (Managed Streaming for Kafka).
    *   **MongoDB:** Amazon DocumentDB (MongoDB-compatible) or MongoDB Atlas on AWS.
    *   **Redis:** Amazon ElastiCache for Redis.
*   **Load Balancing:**
    *   Use an Application Load Balancer (ALB) in front of the frontend (Nginx) service/pods.
    *   Configure ALB target groups and routing rules.
    *   ALB can handle SSL termination.
*   **Networking:** Deploy within a VPC (Virtual Private Cloud). Configure security groups to control traffic flow between services (allow frontend ALB to talk to Nginx pods, Nginx pods to backend pods, backend pods to MSK/DocumentDB/ElastiCache).
*   **Configuration Management:**
    *   Use AWS Systems Manager Parameter Store or Secrets Manager to securely store and inject environment variables (database URIs, API keys, regex patterns, delays) into containers instead of hardcoding them in `docker-compose.yml` or Dockerfiles. Kubernetes ConfigMaps and Secrets serve a similar purpose in EKS.
*   **CI/CD:** Implement a CI/CD pipeline (AWS CodePipeline, Jenkins, GitLab CI) to automate building Docker images, pushing them to ECR (Elastic Container Registry), and deploying updates to EKS/ECS.
*   **Monitoring & Logging:** Use Amazon CloudWatch for logs, metrics, and alarms across all services. Integrate application logs (NestJS logger) with CloudWatch Logs.

## Running the Application

1.  Ensure Docker and Docker Compose are installed.
2.  Clone the repository.
3.  Navigate to the project root directory (where `docker-compose.yml` is located).
4.  Run the command:
    ```bash
    docker compose up --build
    ```
5.  Wait for all containers to build and start. This might take a few minutes on the first run. Look for logs indicating successful connections (Kafka, MongoDB, Redis) and the backend/frontend servers starting.
6.  Open your web browser and navigate to: `http://localhost:61234`
7.  The Real-Time Regex Validator application should be visible. Submit strings and observe the status updates in the job history table.

## Environment Variables (Configurable in `docker-compose.yml`)

*   `REGEX_PATTERN`: The regex pattern used for validation (Default: `^[a-zA-Z0-9\s]+$`).
*   `VALIDATION_DELAY_MS`: Simulated delay in milliseconds for async processing (Default: `5000`).
*   Other variables configure connection details for Kafka, MongoDB, and Redis.
