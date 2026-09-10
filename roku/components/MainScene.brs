sub Init()
    m.relayGrid = m.top.findNode("lampGrid")
    m.statusLabel = m.top.findNode("statusLabel")
    m.focusedLabel = m.top.findNode("focusedLabel")
    m.stateReaderTimer = m.top.findNode("stateReaderTimer")

    m.isProcessing = false
    m.stateReaderRunning = false
    m.stateReaderIndex = 0
    m.editingIndex = -1
    m.bridgeBaseUrl = "https://mqtt-rokubrd-rfo2fpeh.manus.space"
    m.bridgeApiToken = "roku-bridge-cassio47"
    m.stateVersion = 0

    m.relayGrid.observeField("itemSelected", "onGridSelectionChanged")
    m.relayGrid.observeField("itemSelected", "onRelaySelected")

    if m.stateReaderTimer <> invalid then
        m.stateReaderTimer.observeField("fire", "startStateReader")
    end if

    m.relayNames = [
        "LÂMPADA ÁREA FRONTAL",
        "LÂMPADA ÁREA LATERAL",
        "LÂMPADA COZINHA",
        "LÂMPADA SALA",
        "LÂMPADA QUARTO 1",
        "LÂMPADA QUARTO 2",
        "LÂMPADA BANHEIRO",
        "LÂMPADA QUINTAL"
    ]

    loadInitialStates()
    onGridSelectionChanged()

    if m.stateReaderTimer <> invalid then
        m.stateReaderTimer.control = "START"
    end if
end sub


' ============================================================
' CARREGA OS RELAYS
' ============================================================

sub loadInitialStates()
    rootNode = CreateObject("roSGNode", "ContentNode")

    for i = 0 to m.relayNames.Count() - 1
        item = rootNode.CreateChild("ContentNode")
        item.addField("relayId", "integer", false)
        item.relayId = i + 1
        item.addField("state", "string", false)
        item.state = "OFF"
        item.title = loadNameFromRegistry(i + 1, m.relayNames[i])
    end for

    m.relayGrid.content = rootNode
    m.relayGrid.setFocus(true)
end sub


sub onGridSelectionChanged()
    if m.focusedLabel = invalid then return
    if m.relayGrid = invalid or m.relayGrid.content = invalid then return

    selectedIndex = m.relayGrid.itemSelected
    if selectedIndex < 0 then return

    node = m.relayGrid.content.getChild(selectedIndex)
    if node = invalid then return

    title = "CANAL " + (selectedIndex + 1).ToStr()
    if node.title <> invalid and node.title.ToStr() <> "" then title = UCase(node.title.ToStr())

    state = "DESLIGADO"
    if node.state <> invalid then
        st = UCase(node.state.ToStr())
        if st = "ON" or st = "TRUE" or st = "1" then state = "LIGADO"
    end if

    m.focusedLabel.text = title + "  •  " + state
end sub


' ============================================================
' PUBLICAÇÃO MQTT
' ============================================================

sub onRelaySelected()
    if m.isProcessing then return
    if m.relayGrid = invalid or m.relayGrid.content = invalid then return

    selectedIndex = m.relayGrid.itemSelected
    selectedNode = m.relayGrid.content.getChild(selectedIndex)
    if selectedNode = invalid then return

    m.isProcessing = true

    st = ""
    if selectedNode.state <> invalid then st = UCase(selectedNode.state.ToStr())

    if st = "ON" or st = "TRUE" or st = "1"
        targetState = "OFF"
    else
        targetState = "ON"
    end if

    m.cmdNode = selectedNode
    m.cmdTargetState = targetState

    payload = {
        "channel": selectedNode.relayId,
        "state": targetState
    }

    m.cmdTask = CreateObject("roSGNode", "NetworkTask")
    m.cmdTask.url = m.bridgeBaseUrl + "/api/bridge/publish"
    m.cmdTask.authHeader = "Bearer " + m.bridgeApiToken
    m.cmdTask.postBody = FormatJson(payload)
    m.cmdTask.observeField("success", "onCommandResponse")
    m.cmdTask.control = "RUN"
end sub


' ============================================================
' RESPOSTA DA PUBLICAÇÃO
' ============================================================

sub onCommandResponse()
    if m.cmdTask <> invalid and m.cmdTask.success = true
        if m.cmdNode <> invalid then m.cmdNode.state = m.cmdTargetState
    end if

    m.isProcessing = false
    onGridSelectionChanged()
end sub


' ============================================================
' LEITOR MQTT
' ============================================================

sub startStateReader()
    if m.stateReaderRunning or m.isProcessing then return
    if m.relayGrid = invalid or m.relayGrid.content = invalid then return
    if m.relayGrid.content.getChildCount() = 0 then return

    m.stateReaderRunning = true
    m.stateTask = CreateObject("roSGNode", "StateTask")
    m.stateTask.url = m.bridgeBaseUrl + "/api/bridge/wait?since=" + m.stateVersion.ToStr()
    m.stateTask.authHeader = "Bearer " + m.bridgeApiToken
    m.stateTask.observeField("success", "onStateTaskResponse")
    m.stateTask.control = "RUN"
end sub


' ============================================================
' RESPOSTA DO LEITOR
' ============================================================

sub onStateTaskResponse()
    m.stateReaderRunning = false
    if m.stateTask = invalid then return

    if m.stateTask.success = true and m.stateTask.response <> ""
        json = ParseJson(m.stateTask.response)
        if json <> invalid
            if json.version <> invalid then m.stateVersion = json.version
            if json.channels <> invalid
                for each channel in json.channels
                    if channel.channel <> invalid and channel.state <> invalid
                        mqttState = UCase(channel.state.ToStr().Trim())
                        if mqttState = "ON" or mqttState = "OFF" then updateRelayState(channel.channel, mqttState)
                    end if
                next
            end if
            m.statusLabel.text = "● PONTE • conectado"
            m.statusLabel.color = "0x59F39FFF"
        end if
    else
        m.statusLabel.text = "● PONTE • reconectando"
        m.statusLabel.color = "0xFFB45EFF"
    end if

    if m.stateReaderTimer <> invalid then m.stateReaderTimer.control = "START"
end sub


sub updateRelayState(relayId as Integer, newState as String)
    if m.relayGrid = invalid or m.relayGrid.content = invalid then return

    total = m.relayGrid.content.getChildCount()
    for i = 0 to total - 1
        node = m.relayGrid.content.getChild(i)
        if node <> invalid and node.relayId = relayId
            oldState = ""
            if node.state <> invalid then oldState = UCase(node.state.ToStr())
            if oldState <> newState then node.state = newState
            exit for
        end if
    next

    onGridSelectionChanged()
end sub


' ============================================================
' TECLAS E EDITOR DE NOMES
' ============================================================

function onKeyEvent(key as String, press as Boolean) as Boolean
    handled = false
    if press and (key = "options" or key = "*")
        showKeyboardDialog()
        handled = true
    end if
    return handled
end function


sub showKeyboardDialog()
    if m.relayGrid = invalid or m.relayGrid.content = invalid then return

    selectedIndex = m.relayGrid.itemSelected
    if selectedIndex < 0 then return

    node = m.relayGrid.content.getChild(selectedIndex)
    if node = invalid then return

    m.editingIndex = selectedIndex
    m.keyboardDialog = CreateObject("roSGNode", "KeyboardDialog")
    m.keyboardDialog.title = "Editar nome do botão"
    m.keyboardDialog.text = node.title
    m.keyboardDialog.buttons = ["SALVAR", "CANCELAR"]
    m.keyboardDialog.observeField("buttonSelected", "onKeyboardClosed")
    m.top.appendChild(m.keyboardDialog)
    m.keyboardDialog.setFocus(true)
end sub


sub onKeyboardClosed()
    if m.keyboardDialog = invalid then return

    if m.keyboardDialog.buttonSelected = 0
        selectedIndex = m.editingIndex
        newText = m.keyboardDialog.text
        if selectedIndex >= 0 and newText <> ""
            node = m.relayGrid.content.getChild(selectedIndex)
            if node <> invalid
                node.title = UCase(newText.Trim())
                saveNameToRegistry(node.relayId, node.title)
            end if
        end if
    end if

    m.top.removeChild(m.keyboardDialog)
    m.keyboardDialog = invalid
    m.editingIndex = -1
    m.relayGrid.setFocus(true)
    onGridSelectionChanged()
end sub


' ============================================================
' REGISTRY
' ============================================================

sub saveNameToRegistry(relayId as Integer, newName as String)
    section = CreateObject("roRegistrySection", "RelayConfig")
    section.Write("name_" + relayId.ToStr(), newName)
    section.Flush()
end sub


function loadNameFromRegistry(relayId as Integer, defaultName as String) as String
    section = CreateObject("roRegistrySection", "RelayConfig")
    key = "name_" + relayId.ToStr()
    if section.Exists(key) then return section.Read(key)
    return defaultName
end function
