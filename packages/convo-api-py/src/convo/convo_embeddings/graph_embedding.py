import age


class AGEClient:
    def __init__(
        self,
        graph: str,
        host: str,
        port: str,
        dbname: str,
        user: str,
        passsword: str,
    ):
        self.ag = age.connect(
            graph=graph,
            host=host,
            port=port,
            dbname=dbname,
            user=user,
            password=passsword,
        )
