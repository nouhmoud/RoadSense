pipeline {
    agent any

    environment {
        // Définition des variables d'environnement si nécessaire
        COMPOSE_PROJECT_NAME = "roadsense"
    }

    stages {
        stage('Checkout') {
            steps {
                // Récupération du code source
                checkout scm
            }
        }

        stage('Environment Setup') {
            steps {
                script {
                    // Création du fichier .env si nécessaire (exemple basique)
                    if (!fileExists('.env')) {
                        echo "Creating default .env file..."
                        writeFile file: '.env', text: '''
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=geodb
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
'''
                    }
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                script {
                    echo "Building Docker images..."
                    // Utilisation de docker-compose pour construire les images
                    if (isUnix()) {
                        sh 'docker-compose build'
                    } else {
                        bat 'docker-compose build'
                    }
                }
            }
        }

        stage('Run Tests') {
            steps {
                echo "Running tests..."
                // Ajoutez ici vos commandes de test (ex: pytest, npm test)
                // Pour l'instant, on laisse un placeholder
            }
        }

        stage('Deploy / Start Services') {
            steps {
                script {
                    echo "Starting services..."
                    // Lancement des conteneurs en mode détaché
                    if (isUnix()) {
                        sh 'docker-compose up -d'
                        // Nettoyage des images inutilisées
                        sh 'docker image prune -f' 
                    } else {
                        bat 'docker-compose up -d'
                        bat 'docker image prune -f'
                    }
                }
            }
        }
    }

    post {
        always {
            echo "Pipeline finished."
        }
        success {
            echo "Deployment successful!"
        }
        failure {
            echo "Deployment failed."
        }
    }
}
