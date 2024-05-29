class Node
{   
    constructor(portAddress)
    {
        this.portAddress = portAddress;
        this.temp = "" + portAddress;
        this.dnId = temp[1];
        this.serverId = portAddress;
        console.log("Cons Port: ", this.portAddress);
    }

    getDnId()
    {
        return this.dnId;
    }
    getServerId()
    {
        return this.serverId;
    }
    getPortAddress()
    {
        return this.portAddress;
    }
    /*
    setDnId(dnId)
    {
        this.dnId = dnId;
    }
    setServerId(serverId)
    {
        this.serverId = serverId;
    }*/

    
}

module.exports = Node;