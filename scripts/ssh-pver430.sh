#!/bin/bash
export SSHPASS=46774677
exec sshpass -e ssh -o StrictHostKeyChecking=no root@192.168.1.233 "$@"
