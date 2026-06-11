package kubernetes.admission

deny[msg] {
    input.kind == "Deployment"
    not input.spec.template.spec.containers[0].resources.limits
    msg := "Containers must have resource limits defined."
}
