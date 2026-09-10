sub init()

    m.top.functionName = "readState"

end sub


sub readState()

    url = m.top.url

    if url = invalid or url = "" then

        print "STATETASK: URL INVALIDA"

        m.top.success = false

        return

    end if


    request = CreateObject("roUrlTransfer")

    request.SetCertificatesFile("common:/certs/ca-bundle.crt")

    request.InitClientCertificates()

    request.SetUrl(url)

    request.AddHeader("Content-Type", "application/json")


    if m.top.authHeader <> invalid then

        if m.top.authHeader <> "" then

            request.AddHeader("Authorization", m.top.authHeader)

        end if

    end if


    port = CreateObject("roMessagePort")

    request.SetMessagePort(port)

    ok = request.AsyncGetToString()


    if not ok then

        print "STATETASK: AsyncGetToString FALHOU"

        m.top.success = false

        return

    end if


    msg = wait(30000, port)


    if type(msg) <> "roUrlEvent" then

        print "STATETASK: TIMEOUT"

        m.top.success = false

        return

    end if


    code = msg.GetResponseCode()

    print "STATETASK HTTP CODE: "; code


    if code = 200 or code = 202 then

        m.top.response = msg.GetString()

        m.top.success = true

        print "STATETASK RESPONSE:"

        print m.top.response

    else

        m.top.response = ""

        m.top.success = false

        print "STATETASK HTTP ERROR: "; code

    end if

end sub