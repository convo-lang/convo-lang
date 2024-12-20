FROM continuumio/miniconda3:latest

WORKDIR /transcriber


# RUN sed -i 's/stable\/updates/stable-security\/updates/' /etc/apt/sources.list
RUN apt-get update
RUN apt-get install -y ffmpeg
RUN pip install setuptools-rust

## Start Whisper 2 Setup
RUN pip install git+https://github.com/m-bain/whisperx.git@stable
## End Setup

## Start Whisper 3 Setup
# RUN conda config --append channels conda-forge

# RUN conda create --name whisperx python=3.10

# # Setup shell to use conda env
# SHELL ["conda", "run", "-n", "whisperx", "/bin/bash", "-c"]

# # GPU
# # RUN conda install pytorch==2.0.0 torchaudio==2.0.0 pytorch-cuda=11.8 -c pytorch -c nvidia

# # CPU
# #RUN conda install pytorch==2.0.0 torchaudio==2.0.0 cpuonly -c pytorch
# RUN pip install -U torch torchaudio

# RUN pip install git+https://github.com/m-bain/whisperx.git
## End Setup

ENV PATH /opt/conda/envs/whisperx/bin:$PATH

WORKDIR /app
RUN pip install kafka-python-ng
COPY transcribe_queue.py transcribe_queue.py

#CMD ["sleep","9999999999999"]

CMD ["python","transcribe_queue.py"]

# whisperx sample.mp4 --compute_type int8
