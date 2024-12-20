import json
import os
import uuid
from kafka import KafkaConsumer

topic=os.environ.get('TRANSCRIBE_TOPIC')
broker=os.environ.get('KAFKA_BROKERS')
cpu_only=os.environ.get('CPU_ONLY')
docs=os.environ.get('DOCUMENT_PREFIX_PATH')


print(
    'Start transcriber',
    "topic = ",topic,
    "broker = ",broker,
    "cpu_only = ",cpu_only,
    "docs = ",docs,
    flush=True
)



# Kafka Consumer
consumer = KafkaConsumer(
    topic,
    bootstrap_servers=broker,
    max_poll_records = 1,
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    #auto_offset_reset='earliest',
    api_version=(2,8,1)
)

print("Reading topic",flush=True)

for message in consumer:

    request=message.value['value']
    if not 'format' in request:
        continue


    print("transcribe request",request,flush=True)


    format=request['format']
    src=os.path.join(docs,request['path'][1:])
    dest=os.path.dirname(src)
    tmpOut='out/'+uuid.uuid4().hex

    print("transcribe ",format,src,'->',tmpOut,'->',dest,flush=True)

    if not os.path.isdir('out'):
        os.mkdir('out')

    os.mkdir(tmpOut)

    cmd=(
        "whisperx "+
        f"'{src}' "+
        f"--output_dir '{tmpOut}' "+
        f"--output_type '{format}' "+
        '--threads 2 '+
        #('--compute_type int8 ' if cpu_only == "true" else '')
        "&& "+
        f'mv {tmpOut}/* "{dest}" && '+
        f"rm -rf '{tmpOut}'"
    )

    print("cmd",cmd,flush=True)

    os.system(cmd)

    print("transcription complete",dest,flush=True)

