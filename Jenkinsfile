pipeline {
    agent any

    environment {
        SCANNER_HOME = tool 'SonarQubeScanner'
        HARBOR_CREDENTIALS_ID = 'harbor-creds'
        HARBOR_URL = 'harbor.local'
        PROJECT_NAME = 'devsecops-portfolio'
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
                withSonarQubeEnv('SonarQubeServer') {
                    sh "${SCANNER_HOME}/bin/sonar-scanner"
                }
            }
        }

        stage('OWASP Dependency Check - SCA') {
            steps {
                dependencyCheck additionalArguments: '--scan ./ --format ALL', odcInstallation: 'Dependency-Check'
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
                sh 'docker build -t ${HARBOR_URL}/${PROJECT_NAME}/portfolio:${BUILD_NUMBER} ./frontend'
            }
        }

        stage('Trivy - Image Scanning') {
            steps {
                sh "trivy image --severity HIGH,CRITICAL ${HARBOR_URL}/${PROJECT_NAME}/portfolio:${BUILD_NUMBER}"
            }
        }

        stage('Push to Harbor') {
            steps {
                withCredentials([usernamePassword(credentialsId: HARBOR_CREDENTIALS_ID, usernameVariable: 'USER', passwordVariable: 'PASS')]) {
                    sh "docker login ${HARBOR_URL} -u ${USER} -p ${PASS}"
                    sh "docker push ${HARBOR_URL}/${PROJECT_NAME}/portfolio:${BUILD_NUMBER}"
                }
            }
        }

        stage('ArgoCD - GitOps Sync') {
            steps {
                // Usually involves updating a separate manifest repo or a folder in this repo
                sh "sed -i 's|image:.*|image: ${HARBOR_URL}/${PROJECT_NAME}/portfolio:${BUILD_NUMBER}|' k8s/deployment.yaml"
                sh "git add k8s/deployment.yaml && git commit -m 'Update image to ${BUILD_NUMBER}' && git push"
                sh "argocd app sync ${PROJECT_NAME}"
            }
        }

        stage('Kubernetes - Health Check') {
            steps {
                sh "kubectl rollout status deployment/portfolio-app"
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
