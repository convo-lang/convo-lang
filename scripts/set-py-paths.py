import glob
import os

if not os.path.exists('venv'):
    print('This scripts should be ran from in a python project with a virtual environment named venv')
    print('For example, you could run this script in the packages/convo-embeddings-py directory')
    exit(1)

cwd=os.getcwd()

baseName=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

packages=glob.glob(f'{baseName}/packages/*-py')

outNames=[]
for pk in packages:
    dir=f'{pk}/src'
    if dir.startswith(cwd):
        continue
    outNames.append(dir)

paths='\n'.join(outNames)+'\n'

lib=glob.glob('./venv/lib/python*')[0]
if not lib:
    print('Python lib in venv not found')
    exit(1)

outPath=f'{lib}/site-packages/iyio.pth'

with open(outPath,'w') as file:
    file.write(paths)

print(f'paths written to {outPath}')
print(paths)
