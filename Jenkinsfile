pipeline {
    agent any

    environment {
        SCANNER_HOME = tool 'SonarQubeScanner'
        DOCKER_HUB_CREDENTIALS_ID = 'docker-creds'
        DOCKER_HUB_USER = 'mickey06'
        PROJECT_NAME = 'test'
        ARGOCD_SERVER = '34.203.204.73:30443'
    }

    stages {
        stage('Git Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Gitleaks - Secret Scanning') {
            steps {
                sh 'gitleaks detect --source . --verbose'
            }
        }

        stage('Hadolint - Dockerfile Linting') {
            steps {
                sh 'hadolint frontend/Dockerfile'
            }
        }

        stage('Checkov - IaC Scanning') {
            steps {
                sh 'checkov --config-file .checkov.yaml'
            }
        }

        stage('Bandit - Python SAST') {
            steps {
                sh 'bandit -c .bandit -r backend/'
            }
        }

        stage('ESLint Security - JS SAST') {
            steps {
                dir('frontend') {
                    sh 'npm install'
                    sh 'npm run lint'
                }
            }
        }

        stage('SonarQube CE - Static Analysis') {
            steps {
                withSonarQubeEnv('sonarqube') {
                    sh "${SCANNER_HOME}/bin/sonar-scanner"
                }
            }
        }

        stage('OWASP Dependency Check - SCA') {
            steps {
                withCredentials([string(credentialsId: 'nvd-api-key', variable: 'NVD_API_KEY')]) {
                    dependencyCheck(
                        odcInstallation: 'Dependency-Check',
                        additionalArguments: "--scan ./ --format ALL --nvdApiKey ${NVD_API_KEY}"
                    )
                }
                dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
            }
        }

        stage('Syft - SBOM Generation') {
            steps {
                sh 'syft . -o cyclonedx-json=bom.json'
            }
        }

        stage('Docker Build') {
            steps {
                sh 'docker build -t ${DOCKER_HUB_USER}/portfolio:${BUILD_NUMBER} ./frontend'
            }
        }

        stage('Trivy - Image Scanning') {
            steps {
                sh "trivy image --severity HIGH,CRITICAL ${DOCKER_HUB_USER}/portfolio:${BUILD_NUMBER}"
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(credentialsId: "${DOCKER_HUB_CREDENTIALS_ID}", usernameVariable: 'USER', passwordVariable: 'PASS')]) {
                    sh "docker login -u ${USER} -p ${PASS}"
                    sh "docker push ${DOCKER_HUB_USER}/portfolio:${BUILD_NUMBER}"
                }
            }
        }

        stage('ArgoCD - GitOps Sync') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'github token',
                        usernameVariable: 'GIT_USER',
                        passwordVariable: 'GIT_TOKEN'
                    ),
                    string(
                        credentialsId: 'argocd-token',
                        variable: 'ARGOCD_TOKEN'
                    )
                ]) {

                    sh '''
                        git config user.email "jenkins@example.com"
                        git config user.name "Jenkins CI"

                        git checkout main

                        sed -i "s|image:.*|image: ${DOCKER_HUB_USER}/portfolio:${BUILD_NUMBER}|" k8s/deployment.yaml

                        git add k8s/deployment.yaml
                        git commit -m "Update image to ${BUILD_NUMBER}" || true

                        git remote set-url origin https://${GIT_USER}:${GIT_TOKEN}@github.com/Mihaash/test.git

                        git push origin main

                        argocd app sync ${PROJECT_NAME} \
                          --server ${ARGOCD_SERVER} \
                          --auth-token ${ARGOCD_TOKEN} \
                          --grpc-web \
                          --insecure
                    '''
                }
            }
        }

        stage('Kubernetes - Health Check') {
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'Credentials', accessKeyVariable: 'AWS_ACCESS_KEY_ID', secretKeyVariable: 'AWS_SECRET_ACCESS_KEY']]) {
                    sh "kubectl rollout status deployment/portfolio-app"
                }
            }
        }

        stage('OWASP ZAP - DAST') {
            steps {
                // Run ZAP against the deployed application
                sh 'zap-baseline.py -t http://portfolio-app.local -r zap_report.html'
            }
        }

        stage('OPA - Policy Enforcement') {
            steps {
                sh 'opa eval --format pretty -i k8s/deployment.yaml -d opa-policies/ "data.kubernetes.admission.deny"'
            }
        }

        stage('Prometheus & Grafana - Monitoring Check') {
            steps {
                echo "Validating Prometheus targets and Grafana dashboards..."
                // Example: check if Prometheus can reach the new service
                sh 'curl -s http://prometheus:9090/api/v1/targets | grep portfolio-service'
            }
        }

        stage('Alertmanager - Alerting Check') {
            steps {
                echo "Ensuring Alertmanager config is active..."
                sh 'amtool config show'
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo "Pipeline completed successfully!"
        }
        failure {
            echo "Pipeline failed. Check logs."
        }
    }
}
