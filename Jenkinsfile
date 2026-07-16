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
                    echo "Copiando reportes desde el contenedor al Workspace de Jenkins..."
                    sh "docker cp \$(docker compose -f ${DOCKER_COMPOSE_FILE} ps -q app):/app/coverage ./coverage || true"
                    
                    echo "Generando reportes con Plugins de Jenkins..."
                    junit allowEmptyResults: true, testResults: '**/junit.xml'
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage',
                        reportFiles: 'index.html',
                        reportName: 'Integration Test Coverage'
                    ])
                    
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
                sh "docker compose -f ${DOCKER_COMPOSE_FILE} exec -T app node -e \"fetch('http://localhost:3000/health').then(res => { console.log('Status E2E:', res.status); process.exit(res.ok ? 0 : 1); }).catch(err => { console.error(err); process.exit(1); });\""
            }
            post {
                always {
                    echo "Limpiando stack E2E..."
                    sh "docker compose -f ${DOCKER_COMPOSE_FILE} down -v"
                }
            }
        }

        stage('Pruebas de Rendimiento') {
            when {
                expression { return env.BRANCH_NAME == 'main' }
            }
            steps {
                echo "Levantando infraestructura para Pruebas de Rendimiento..."
                sh "docker compose -f ${DOCKER_COMPOSE_FILE} up -d"
                sleep 10
                
                echo "Simulando carga (100 peticiones concurrentes al endpoint /health)..."
                sh 'docker compose -f ' + env.DOCKER_COMPOSE_FILE + ' exec -T app node -e "const promesas = Array.from({ length: 100 }, (_, i) => fetch(\'http://localhost:3000/health\').then(res => console.log(\'Peticion \' + (i + 1) + \': Status \' + res.status)).catch(err => console.error(\'Peticion \' + (i + 1) + \' Fallida:\', err.message))); Promise.all(promesas).then(() => process.exit(0));"'
            }
            post {
                always {
                    echo "Limpiando stack de Pruebas de Rendimiento..."
                    sh "docker compose -f ${DOCKER_COMPOSE_FILE} down -v"
                }
            }
        }

        stage('Monitoreo de Servicios') {
            when {
                expression { return env.BRANCH_NAME == 'main' }
            }
            steps {
                echo "Levantando infraestructura para Monitoreo..."
                sh "docker compose -f ${DOCKER_COMPOSE_FILE} up -d"
                sleep 10
                
                echo "Estado actual de los contenedores:"
                sh "docker compose -f ${DOCKER_COMPOSE_FILE} ps"
                
                echo "Últimas líneas de logs de PostgreSQL:"
                sh "docker compose -f ${DOCKER_COMPOSE_FILE} logs --tail=20 postgres"
                
                echo "Últimas líneas de logs de Redis:"
                sh "docker compose -f ${DOCKER_COMPOSE_FILE} logs --tail=20 redis"
            }
            post {
                always {
                    echo "Limpiando stack de Monitoreo..."
                    sh "docker compose -f ${DOCKER_COMPOSE_FILE} down -v"
                }
            }
        }

        stage('Pruebas de Resiliencia') {
            when {
                expression { return env.BRANCH_NAME == 'main' }
            }
            steps {
                echo "Levantando stack completo para Prueba de Resiliencia..."
                sh "docker compose -f ${DOCKER_COMPOSE_FILE} up -d"
                sleep 10
                
                echo "Simulando caída de infraestructura: Deteniendo contenedor Redis..."
                sh "docker compose -f ${DOCKER_COMPOSE_FILE} stop redis"
                sleep 5
                
                echo "Verificando que la app responda /health con tolerancia a fallos..."
                sh "docker compose -f ${DOCKER_COMPOSE_FILE} exec -T app node -e \"fetch('http://localhost:3000/health').then(res => { console.log('Status Resiliencia sin Redis:', res.status); process.exit(res.ok ? 0 : 1); }).catch(err => { console.error(err); process.exit(1); });\""
            }
            post {
                always {
                    echo "Limpiando infraestructura de Resiliencia..."
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
