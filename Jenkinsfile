pipeline {
    agent any

    tools {
        nodejs 'Node-M1'
    }

    environment {
        APP_NAME = 'jenkins-multicontainer-app'
        DOCKER_COMPOSE_FILE = 'docker/docker-compose.test.yml'
    }

    stages {
        stage('Preparacion del Entorno') {
            steps {
                echo "Clonando repositorio..."
                checkout scm
                echo "Verificando herramientas del Host..."
                sh "docker --version"
                sh "docker compose version"
            }
        }

        stage('Instalacion de Dependencias') {
            steps {
                echo "Instalando dependencias locales en el Workspace..."
                sh "npm install"
            }
        }

        stage('Pruebas Unitarias') {
            steps {
                echo "Ejecutando pruebas unitarias..."
                sh "npm run test:unit"
            }
        }

        stage('Pruebas de Integracion (Multi-Contenedor)') {
            steps {
                echo "Levantando stack multi-contenedor completo para pruebas..."
                // Limpieza preventiva
                sh "docker compose -f ${DOCKER_COMPOSE_FILE} down -v"
                
                // Construimos la imagen y levantamos todo el stack (incluyendo app, postgres y redis)
                sh "docker compose -f ${DOCKER_COMPOSE_FILE} up -d --build"
                
                echo "Esperando inicializacion de servicios..."
                sleep 15
                
                echo "Ejecutando pruebas de integracion DENTRO del contenedor de la app..."
                // Al ejecutarlo dentro del contenedor 'app', DB_HOST=postgres y REDIS_HOST=redis funcionarán nativamente
                sh "docker compose -f ${DOCKER_COMPOSE_FILE} exec -T app npm run test:integration"
            }
            post {
                always {
                    echo "Limpiando infraestructura y volumenes..."
                    sh "docker compose -f ${DOCKER_COMPOSE_FILE} down -v"
                }
            }
        }

        stage('Prueba End-to-End (Simulacion)') {
            when {
                expression { return env.BRANCH_NAME == 'main' }
            }
            steps {
                echo "Levantando stack completo para pruebas E2E..."
                sh "docker compose -f ${DOCKER_COMPOSE_FILE} up -d"
                sleep 10
                
                echo "Verificando endpoints con cURL..."
                sh "curl -f http://localhost:3000/health"
            }
            post {
                always {
                    echo "Limpiando stack E2E..."
                    sh "docker compose -f ${DOCKER_COMPOSE_FILE} down -v"
                }
            }
        }
    }

    post {
        success {
            echo "=================================================================="
            echo "✅ PIPELINE COMPLETADO EXITOSAMENTE ✅"
            echo "=================================================================="
        }
        failure {
            echo "=================================================================="
            echo "❌ PIPELINE FALLIDO ❌"
            echo "=================================================================="
        }
    }
}
