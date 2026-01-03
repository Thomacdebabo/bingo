# Prediction Bingo

Website which hosts prediction bingos with your friends. The idea is that everybody will have predictions for the next year and we just make a bingo out of that. Of course this should also be able to do adaptable to other events where you want a bingo.

# Run
```
mkdir data
docker build -t bingo-app .
docker run --rm -it -d -p 8000:8000 -v "$(pwd)/data":/app/data bingo-app
```



