FROM python:2.7-alpine
ARG ADDITIONAL_PACKAGE
# Alternatively use ADD https:// (which will not be cached by Docker builder)
RUN apk --no-cache add ${ADDITIONAL_PACKAGE}
RUN pip install flask
RUN pip install redis
RUN pip install pymongo
RUN pip install cassandra-driver
COPY . .
USER root
USER app
USER root
CMD ["python", "flask_kubeless.py"]

