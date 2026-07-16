pipeline {
    agent any

    tools {
        nodejs 'Node-M1'
    }

    environment {
        APP_NAME = 'jenkins-multicontainer-app'
        DOCKER_COMPOSE_FILE = 'docker/docker-compose.test.yml'
        DOCKER_BIN = '/Applications/Docker.app/Contents/Resources/bin/docker'
    }

    stages {
        stage('Preparacion del Entorno') {
            steps {
                echo "Clonando repositorio..."
                checkout scm
                echo "Verificando herramientas del Host..."
                sh "${DOCKER_BIN} --version"
                sh "${DOCKER_BIN} compose version"
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
                echo "Levantando infraestructura auxiliar con Docker Compose..."
                sh "${DOCKER_BIN} compose -f ${DOCKER_COMPOSE_FILE} down -v"
                sh "${DOCKER_BIN} compose -f ${DOCKER_COMPOSE_FILE} up -d postgres redis"
                
                echo "Esperando inicializacion de servicios..."
                sleep 15
                
                echo "Ejecutando pruebas de integracion apuntando a los contenedores..."
                withEnv(['DB_HOST=localhost', 'REDIS_HOST=localhost', 'NODE_ENV=test']) {
                    sh "npm run test:integration"
                }
            }
            post {
                always {
                    echo "Limpiando infraestructura y volumenes..."
                    sh "${DOCKER_BIN} compose -f ${DOCKER_COMPOSE_FILE} down -v"
                }
            }
        }

        stage('Prueba End-to-End (Simulacion)') {
            when {
                expression { return env.BRANCH_NAME == 'main' }
            }
            steps {
                echo "Levantando stack completo para pruebas E2E..."
                sh "${DOCKER_BIN} compose -f ${DOCKER_COMPOSE_FILE} up -d"
                sleep 10
                
                echo "Verificando endpoints con cURL..."
                sh "curl -f http://localhost:3000/health"
            }
            post {
                always {
                    echo "Limpiando stack E2E..."
                    sh "${DOCKER_BIN} compose -f ${DOCKER_COMPOSE_FILE} down -v"
                }
            }
        }
    }

    post {
        success {
            echo "=================================================================="
            echo "✅ PIPELINE COMPLETADO EXITOSAMENTE ✅"
            echo "Simulando Notificacion Email de Exito:"
            echo "Para: equipo-dev@ejemplo.com"
            echo "Asunto: Pipeline Exitoso: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
            echo "=================================================================="
        }
        failure {
            echo "=================================================================="
            echo "❌ PIPELINE FALLIDO ❌"
            echo "Simulando Notificacion Email de Error:"
            echo "Para: equipo-dev@ejemplo.com"
            echo "Asunto: Pipeline Fallido: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
            echo "=================================================================="
        }
    }
}
