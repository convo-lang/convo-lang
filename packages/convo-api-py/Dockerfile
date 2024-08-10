# This Dockerfile should be build at the root of the iyio-common repo.
# Use the build-image.sh script to build or the test-image.sh script to test

FROM python:3.11

WORKDIR /app

RUN apt-get update
RUN apt-get install -y libmagic1 libgl1-mesa-dev ffmpeg tesseract-ocr

RUN python3 -m pip install --upgrade pip

COPY packages/convo-api-py/requirements.txt requirements.txt

RUN python3 -m pip install --no-cache-dir -r requirements.txt

# Copy source directories . Remember to add to .gitignore as well
COPY packages/iyio-common-py/src/ packages/iyio-common-py/src
COPY packages/convo-api-py/src/ packages/convo-api-py/src

# The command below can be used to verify copied files
#RUN find . -type f


# Add paths to copied libraries here
ENV PYTHONPATH=/app/packages/iyio-common-py/src

ENV REST_PORT=8080

EXPOSE 8080

WORKDIR /app/packages/convo-api-py

CMD [ "./start-rest-server.sh" ]
