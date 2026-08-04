package kubernetes.admission

import rego.v1

deny contains msg if {
    input.kind == "Deployment"
    not input.spec.template.spec.containers[0].resources.limits
    msg := "Containers must have resource limits defined."
}
