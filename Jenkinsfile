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
                sh "docker compose -f ${DOCKER_COMPOSE_FILE} down -v"
                sh "docker compose -f ${DOCKER_COMPOSE_FILE} up -d --build"
                
                echo "Esperando inicializacion de servicios..."
                sleep 15
                
                echo "Ejecutando pruebas de integracion DENTRO del contenedor de la app..."
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
                
                echo "Verificando endpoints usando Node.js nativo dentro del contenedor..."
                // Usamos fetch de Node 18 para verificar el status code sin requerir curl
                sh """
                docker compose -f ${DOCKER_COMPOSE_FILE} exec -T app node -e "
                fetch('http://localhost:3000/health')
                  .then(res => {
                    console.log('Status E2E:', res.status);
                    process.exit(res.ok ? 0 : 1);
                  })
                  .catch(err => {
                    console.error(err);
                    process.exit(1);
                  });
                "
                """
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
