from sentence_transformers import SentenceTransformer

modelPath='../ai-models/all-mpnet-base-v2'

model = SentenceTransformer(modelPath)

def encode_text(sentences):

    return model.encode(sentences).tolist()
