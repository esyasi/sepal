FROM debian:buster
RUN apt-get update && apt-get install -y \
  curl \
  git \
  nano \
  packer \
  procps \
  python3 \
  python3-pip
RUN pip3 install \
  ansible \
  boto \
  boto3
ENV SEPAL_HOME=/usr/local/lib/sepal
