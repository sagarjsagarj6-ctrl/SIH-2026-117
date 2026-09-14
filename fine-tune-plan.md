replace agent studio cards  and content with fine tune content and more and traning detailings requriment for traning,which is in intagent layer as follows:
only admin as to create and delpoy models with there confidential data,employe,manager can only use model,once deployed ,notification is sent to respective roles,
                    ADMIN
                      │
             Agent Training Panel
                      │
              ┌───────┴────────┐
              │                 │
        Create Agent       Create/Fine-Tune
                                  │
                         Select Base Model
                                  │
                         Upload Confidential Data
                                  │
                         Select Training Method
                                  │
              ┌───────────────────┴──────────────────┐
              │                                      │
       ML Algorithms                         LLM Fine-Tuning
  KNN / SVM / Decision Tree             LoRA / QLoRA / etc.
  Random Forest / XGBoost                    ...
              │                                      │
              └───────────────────┬──────────────────┘
                                  │
                           Start Training
                                  │
                           Evaluation
                                  │
                     ┌────────────┴────────────┐
                     │                         │
                 Failed                     Passed
                     │                         │
               Fix / Retrain                Deploy
                                               │
                                ┌──────────────┴──────────────┐
                                │                             │
                            Manager                       Employee
                                │                             │
                                └──────────────┬──────────────┘
                                               │
                                      Private LAN delivery
                                               │
                                        Agent Studio
                                               │
                              Employee AI Agent / Manager AI Agent
                                               │
                                         Use trained model