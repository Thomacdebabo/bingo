# Backend
Create a server which stores peoples predictions bingo cards. Use FastAPI

A bingo card just is a list of N predictions
A prediction is holding the following:
- Name: A name or short version for the prediction
- Description: a longer descriptions providing more details if needed
- State: True,False, None depending on if the prediction has come true or not or if it is still open
- Note: An additional note which can be added later on


The data should be stored as json files in the backend and can be modeled via pydantic.

The following API endpoints should be created:
- create: Create a new predictions bingo card (storing the json file)
- get: gets a predictions bingo card
- update: Update the bingo card

For simplicity sake we just store the predictions as json files.

# Frontend
We need the following routes:
- new: this page just gives you a form where you can add names and descriptions for a new bingo card
- view: shows a bingo card and allows you to update the state and note of the predictions