#!/bin/bash

sudo systemctl start docker

kubectl get nodes

kubectl get pods -n argocd
